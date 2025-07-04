/**
 * 应用程序基础异常类
 * @param message 错误消息
 * @param code 错误代码 (可选)
 * @param details 错误详情 (可选)
 */
export class AppException extends Error {
  code?: number;
  details?: any;

  constructor(message: string, code?: number, details?: any) {
    super(message);
    this.name = 'AppException';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppException.prototype);
  }
}

/**
 * 网络请求异常
 */
export class NetworkException extends AppException {
  constructor(message: string = '网络请求失败', code?: number, details?: any) {
    super(message, code || 503, details);
    this.name = 'NetworkException';
  }
}

/**
 * 认证异常
 */
export class AuthException extends AppException {
  constructor(message: string = '用户认证失败', code?: number, details?: any) {
    super(message, code || 401, details);
    this.name = 'AuthException';
  }
}

/**
 * 资源不存在异常
 */
export class NotFoundException extends AppException {
  constructor(message: string = '资源不存在', code?: number, details?: any) {
    super(message, code || 404, details);
    this.name = 'NotFoundException';
  }
}