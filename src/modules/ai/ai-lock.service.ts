import { HttpStatus, Injectable } from '@nestjs/common';

import { AppErrorCode, AppException } from '../../common/errors/app.exception';

@Injectable()
export class AiLockService {
  private readonly runningDevices = new Set<string>();

  async runExclusive<T>(deviceId: string, task: () => Promise<T>) {
    if (this.runningDevices.has(deviceId)) {
      throw new AppException(
        AppErrorCode.AiRequestInProgress,
        'ai request already in progress',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.runningDevices.add(deviceId);
    try {
      return await task();
    } finally {
      this.runningDevices.delete(deviceId);
    }
  }
}
