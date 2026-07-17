# EmailJS setup guide

The app now sends approval and meeting emails automatically through EmailJS when the following environment variables are configured.

## 1) Create an EmailJS account
1. Go to https://www.emailjs.com/
2. Create an account and sign in.
3. Create a new Email Service.
4. Connect it to your email provider (Gmail is the easiest starting point).
5. Copy the Service ID.

## 2) Create the templates
Create two templates in EmailJS:

### Access approval template
Use these template variables:
- `{{to_email}}`
- `{{subject}}`
- `{{message}}`
- `{{recipient_name}}`
- `{{decision_type}}`

Recommended template content (copy this into the EmailJS template editor):

Subject:
```text
{{subject}}
```

Body (HTML version):
```html
<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <div style="background: #fffbea; border: 1px solid #f5c400; border-radius: 12px; padding: 24px;">
    <h2 style="margin: 0 0 10px; color: #92400e;">KESCO Dashboard Access Update</h2>
    <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.7;">
      Dear {{recipient_name}},
    </p>
    <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.7;">
      This is to inform you that your request for access to the KESCO Dashboard has been <strong>{{decision_type}}</strong>.
    </p>
    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6;"><strong>Recipient:</strong> {{recipient_name}}</p>
      <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6;"><strong>Email:</strong> {{to_email}}</p>
      <p style="margin: 0; font-size: 14px; line-height: 1.6;"><strong>Status:</strong> {{decision_type}}</p>
    </div>
    <div style="font-size: 14px; line-height: 1.7;">
      {{message}}
    </div>
    <p style="margin: 24px 0 0; font-size: 13px; color: #6b7280; line-height: 1.7;">
      Please follow the instructions provided in this message carefully. If you believe this communication is incorrect or requires clarification, kindly contact the administrator immediately.
    </p>
    <p style="margin: 12px 0 0; font-size: 13px; color: #6b7280;">
      Regards,<br />KESCO Portal Administration
    </p>
  </div>
</div>
```

Body (plain-text version):
```text
Dear {{recipient_name}},

This is to inform you that your request for access to the KESCO Dashboard has been {{decision_type}}.

Please review the details below carefully:

{{message}}

If you believe this communication is incorrect or requires clarification, kindly contact the administrator immediately.

Regards,
KESCO Portal Administration
```

### Meeting notification template
Use these template variables:
- `{{to_email}}`
- `{{subject}}`
- `{{message}}`
- `{{recipient_name}}`

Recommended template content (copy this into the EmailJS template editor):

Subject:
```text
{{subject}}
```

Body (HTML version):
```html
<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <div style="background: #f8fafc; border: 1px solid #dbeafe; border-radius: 12px; padding: 24px;">
    <h2 style="margin: 0 0 10px; color: #1d4ed8;">Meeting Notification</h2>
    <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.7;">
      Dear {{recipient_name}},
    </p>
    <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.7;">
      A new meeting has been scheduled and the relevant details are provided below for your review and necessary action.
    </p>
    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin: 16px 0;">
      <div style="font-size: 14px; line-height: 1.7;">
        {{message}}
      </div>
    </div>
    <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.7;">
      Kindly review the information carefully and make the necessary arrangements.
    </p>
    <p style="margin: 12px 0 0; font-size: 13px; color: #6b7280;">
      Regards,<br />KESCO Portal Administration
    </p>
  </div>
</div>
```

Body (plain-text version):
```text
Dear {{recipient_name}},

A new meeting has been scheduled and the relevant details are provided below for your review and necessary action.

{{message}}

Kindly review the information carefully and make the necessary arrangements.

Regards,
KESCO Portal Administration
```

## 3) Add the environment values
In the project root, update your environment file with the values from EmailJS:

```env
REACT_APP_EMAILJS_SERVICE_ID=your_service_id
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
REACT_APP_EMAILJS_ACCESS_TEMPLATE_ID=your_access_template_id
REACT_APP_EMAILJS_MEETING_TEMPLATE_ID=your_meeting_template_id
```

## 4) Restart the app
After saving the environment values, restart the app so the new variables are picked up.

If EmailJS is not configured, the app will still fall back to opening a mailto draft automatically.
