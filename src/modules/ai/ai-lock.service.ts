import { HttpStatus, Injectable } from "@nestjs/common";

import { AppErrorCode, AppException } from "../../common/errors/app.exception";

@Injectable()
export class AiLockService {
  private readonly runningUsers = new Set<string>();

  async runExclusive<T>(userId: string, task: () => Promise<T>) {
    if (this.runningUsers.has(userId)) {
      throw new AppException(
        AppErrorCode.AiRequestInProgress,
        "ai request already in progress",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.runningUsers.add(userId);
    try {
      return await task();
    } finally {
      this.runningUsers.delete(userId);
    }
  }
}
