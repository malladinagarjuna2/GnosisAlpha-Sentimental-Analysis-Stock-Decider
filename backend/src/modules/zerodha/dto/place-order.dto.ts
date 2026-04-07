import { IsString, IsNotEmpty, IsIn, IsInt, IsOptional, IsNumber, Min } from 'class-validator';

export class PlaceOrderDto {
  @IsString()
  @IsNotEmpty()
  tradingsymbol: string;

  @IsString()
  @IsIn(['NSE', 'BSE'])
  exchange: 'NSE' | 'BSE';

  @IsString()
  @IsIn(['BUY', 'SELL'])
  side: 'BUY' | 'SELL';

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsIn(['MARKET', 'LIMIT'])
  orderType: 'MARKET' | 'LIMIT';

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  postId?: string; // track which post triggered this trade
}
