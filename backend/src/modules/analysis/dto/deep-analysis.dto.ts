import { IsString, IsNotEmpty } from 'class-validator';

export class DeepAnalysisDto {
  @IsString()
  @IsNotEmpty()
  postId: string;
}
