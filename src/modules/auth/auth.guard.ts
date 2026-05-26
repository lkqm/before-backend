import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

import { AuthService } from "./auth.service";

export type AuthenticatedRequest = {
  headers: {
    authorization?: string;
  };
  userId?: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    const userId = this.authService.verifyToken(token);
    request.userId = userId;

    return true;
  }

  private extractBearerToken(authorization?: string) {
    const [scheme, token] = authorization?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) {
      return "";
    }

    return token;
  }
}
