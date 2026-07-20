describe('sendAutomatedEmail', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.REACT_APP_EMAILJS_SERVICE_ID = 'service_test';
    process.env.REACT_APP_EMAILJS_PUBLIC_KEY = 'public_test';
    process.env.REACT_APP_EMAILJS_ACCESS_TEMPLATE_ID = 'access_template';
    global.fetch = jest.fn();
  });

  it('sends an email through EmailJS when the service is configured', async () => {
    global.fetch.mockResolvedValue({ ok: true, text: jest.fn() });

    const { sendAutomatedEmail } = require('./emailSender');
    const result = await sendAutomatedEmail({
      to: 'user@example.com',
      subject: 'Welcome',
      message: 'Your account is ready.',
      templateId: 'access_template',
    });

    expect(result.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.emailjs.com/api/v1/1/email/send',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('returns an error without opening a mail draft when EmailJS is not configured', async () => {
    delete process.env.REACT_APP_EMAILJS_SERVICE_ID;
    delete process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

    const { sendAutomatedEmail } = require('./emailSender');
    const result = await sendAutomatedEmail({
      to: 'user@example.com',
      subject: 'Welcome',
      message: 'Your account is ready.',
    });

    expect(result.ok).toBe(false);
    expect(result.method).toBe('none');
    expect(result.error).toBe('Email delivery unavailable');
  });
});
