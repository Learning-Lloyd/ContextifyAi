<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmailVerificationCodeNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly string $code) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Verify your Contextify email')
            ->greeting('Verify your email address')
            ->line('Enter this six-digit code in Contextify to finish creating your account:')
            ->line($this->code)
            ->line('This code expires in 10 minutes and can only be used once.');
    }
}
