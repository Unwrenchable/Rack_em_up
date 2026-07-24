import { IsNotEmpty, IsString } from 'class-validator';

export class AppendHighlightDto {
  @IsString()
  @IsNotEmpty()
  highlightVideoUrl!: string;
}
