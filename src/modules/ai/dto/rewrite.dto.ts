import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class RewriteDto {
  @ApiProperty({
    description: "需要改写的原始朋友圈文案",
    minLength: 1,
    maxLength: 1000,
    example: "今天来到海边旅游，这里风景优美，让我感受到了生活的美好。",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  text!: string;
}
