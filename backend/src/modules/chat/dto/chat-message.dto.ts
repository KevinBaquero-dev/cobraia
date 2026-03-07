import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}