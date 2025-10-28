/**
 * NewsletterForm Component
 * Handles newsletter subscription form
 */

'use client';

import { useNewsletter } from '@/hooks/useNewsletter';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Message } from '@/components/ui/Message';


export function NewsletterForm() {
  const { email, setEmail, loading, message, subscribe } = useNewsletter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await subscribe({
      source: 'landing_page',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          ariaLabel="Email address"
          autoComplete="email"
          required
          className='text-black placeholderblack placeholder:opacity-100'
        />
        
        <Button
          type="submit"
          loading={loading}
        //   disabled={!email.trim()}
          ariaLabel="Subscribe to newsletter"
          className='bg-[#FDF7E5] text-black'
        >
          Subscribe
        </Button>
      </div>

      <Message text={message.text} type={message.type} />
    </form>
  );
}

export default NewsletterForm;