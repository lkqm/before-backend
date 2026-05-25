import { Body, Controller, Post } from '@nestjs/common';

import { AiService } from './ai.service';
import { CaptionDto } from './dto/caption.dto';
import { RewriteDto } from './dto/rewrite.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('rewrite')
  rewrite(@Body() dto: RewriteDto) {
    return this.aiService.rewrite(dto);
  }

  @Post('caption')
  caption(@Body() dto: CaptionDto) {
    return this.aiService.caption(dto);
  }
}
