/**
 * Physics LMS Frontend-to-Backend HTTP API Client
 * Connects Next.js Frontend to the Standalone Node.js/NestJS Backend Server.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  errorCode?: string | null;
  timestamp: string;
}

export class ApiClient {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Client-side: attach device fingerprint & session headers if available in localStorage
    if (typeof window !== 'undefined') {
      let deviceFp = localStorage.getItem('physics_device_fp');
      if (!deviceFp) {
        deviceFp = 'fp_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('physics_device_fp', deviceFp);
      }
      headers['x-device-fingerprint'] = deviceFp;

      const sessionId = localStorage.getItem('session_id');
      if (sessionId) {
        headers['x-session-id'] = sessionId;
      }

      const token = localStorage.getItem('access_token');
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      // Handle device session invalidation / eviction
      if (response.status === 401 && (data.errorCode === 'AUTH_005' || data.errorCode === 'AUTH_004')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          alert(data.message || 'تم تسجيل الدخول من جهاز آخر. تم إنهاء الجلسة لحماية الحساب.');
          window.location.href = '/login';
        }
      }
      throw new Error(data.message || 'حدث خطأ في الاتصال بالخادم');
    }

    return data;
  }

  // --- Auth Endpoints ---
  static async login(phone: string, password: string) {
    const res = await this.request<{
      user: any;
      sessionId: string;
      tokens: { accessToken: string; refreshToken: string; expiresIn: string };
      session: any;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });

    if (typeof window !== 'undefined') {
      const activeSessionId = res.data?.sessionId || res.data?.session?.sessionId;
      if (activeSessionId) {
        localStorage.setItem('session_id', activeSessionId);
      }
      if (res.data?.tokens?.accessToken) {
        localStorage.setItem('access_token', res.data.tokens.accessToken);
        localStorage.setItem('refresh_token', res.data.tokens.refreshToken);
      }
    }
    return res;
  }

  static async register(name: string, phone: string, password: string, grade: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, phone, password, grade }),
    });
  }

  static async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('session_id');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
  }

  static async forgotPassword(email: string) {
    return this.request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  static async verifyOtp(email: string, otp: string) {
    return this.request<{ success: boolean; message: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  static async resetPassword(email: string, otp: string, newPassword: string) {
    return this.request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    });
  }

  // --- Courses & Video Protection Endpoints ---
  static async getCourses(grade?: string) {
    return this.request<any[]>(`/courses${grade ? `?grade=${grade}` : ''}`);
  }

  static async getCourseDetails(courseId: string) {
    return this.request<any>(`/courses/${courseId}`);
  }

  static async unlockCourse(code: string) {
    return this.request('/courses/unlock', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  static async getSignedStreamUrl(lessonId: string) {
    return this.request<{
      lessonId: string;
      title: string;
      signedStreamUrl: string;
      streamToken: string;
      expiresAt: number;
    }>(`/videos/signed-url/${lessonId}`);
  }

  static async getWatermarkMetadata(lessonId: string) {
    return this.request<{
      studentId: string;
      studentName: string;
      studentPhone: string;
      studentIp: string;
      displayIntervalSeconds: number;
      trajectorySeed: number;
    }>(`/videos/watermark/${lessonId}`);
  }

  // --- Exams & Quizzes Endpoints ---
  static async getExam(quizId: string) {
    return this.request<any>(`/exams/${quizId}`);
  }

  static async submitExam(quizId: string, answers: Record<string, number | string>) {
    return this.request<{
      attemptId: string;
      score: number;
      passed: boolean;
      totalQuestions: number;
      correctAnswersCount: number;
      review: any[];
    }>('/exams/submit', {
      method: 'POST',
      body: JSON.stringify({ quizId, answers }),
    });
  }

  // --- Analytics & Progress ---
  static async trackWatchProgress(lessonId: string, watchedSeconds: number, totalSeconds: number) {
    return this.request('/analytics/watch-progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId, watchedSeconds, totalSeconds }),
    });
  }

  static async getStudentDashboard() {
    return this.request('/analytics/student');
  }
}
