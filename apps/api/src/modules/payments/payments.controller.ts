import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';

@ApiTags('payments')
@Controller('payments')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post('create-intent')
  @ApiOperation({ summary: 'Create payment intent' })
  createIntent(@CurrentUser() user: JwtUser, @Body('appointmentId') appointmentId: string) {
    return this.payments.createPaymentIntent(appointmentId, user.id);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm payment' })
  confirm(
    @Body('paymentId') paymentId: string,
    @Body('providerPaymentId') providerPaymentId: string,
  ) {
    return this.payments.confirmPayment(paymentId, providerPaymentId);
  }

  @Post('refund')
  @ApiOperation({ summary: 'Issue refund' })
  refund(
    @Body('paymentId') paymentId: string,
    @Body('amount') amount?: number,
    @Body('reason') reason?: string,
  ) {
    return this.payments.refund(paymentId, amount, reason);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get payment history' })
  history(
    @CurrentUser() user: JwtUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.payments.getPaymentHistory(user.id, parseInt(page ?? '1'), parseInt(limit ?? '20'));
  }
}
