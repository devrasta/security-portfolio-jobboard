import { IsString, Length } from 'class-validator';

export class Disable2FADto {
  @IsString()
  @Length(6, 6)
  code: string;
}
