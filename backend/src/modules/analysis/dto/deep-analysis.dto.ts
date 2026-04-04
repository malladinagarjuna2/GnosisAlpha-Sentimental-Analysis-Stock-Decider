import { IsString, IsOptional } from 'class-validator';

export class DeepAnalysisDto {
  @IsOptional()
  @IsString()
  postId?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  asset?: string;
}
