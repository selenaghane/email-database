/**
 * Email Library - outreach copy.
 *
 * Edit freely; Code.gs never needs to change when the wording does.
 *
 * Placeholders, filled per row from the sheet:
 *   {{Name}}       full Name column
 *   {{FirstName}}  first word of Name, or "there" when the cell is empty
 *   {{Org}}        Org column
 *   {{Note}}       Personal note column - the one line that makes it not a blast
 *   {{FromName}}   CONFIG.FROM_NAME
 *   {{SiteUrl}}    the library
 *   {{SubmitUrl}}  the submit form
 *
 * Template keys map to a row's Type column:
 *   student / studentFollowup   Type = student
 *   org / orgFollowup           Type = org
 *   creator / creatorFollowup   Type = creator
 *
 * The creator pair is for people you have never met who publish to an
 * audience. {{Org}} holds their handle, and {{Note}} carries the whole
 * burden of "why you specifically" - there is no shared class or mutual
 * friend to fall back on.
 *
 * Two things to keep when rewriting these:
 *   - The opt-out line. It is what separates outreach from spam, and it is
 *     also what makes the single follow-up defensible.
 *   - The redaction promise. Submitters paste far more readily once they know
 *     they do not have to censor anything themselves, which is exactly how the
 *     submit form is written.
 */

const TEMPLATES = {

  student: {
    subject: 'The cold email that worked for you',

    body: [
      'Hi {{FirstName}},',
      '',
      '{{Note}}',
      '',
      'I built a small free site called the Email Library: real student outreach emails that actually got a reply - cold emails to professors, internship inquiries, podcast and event invites - each one annotated with the specific moves it makes. Most people write their first cold email having never seen one, which seems like a fixable problem.',
      '',
      'If you have sent one that worked, would you add it? It takes about two minutes:',
      '{{SubmitUrl}}',
      '',
      'Worth knowing before you do:',
      '',
      '- Paste it exactly as you have it. You do not need to redact anything - names, schools, and titles get replaced with placeholders before anything is published.',
      '- The reply you got is never published, so pasting the whole thread is fine if that is easier.',
      '- Credit is your call: your name, or completely anonymous.',
      '',
      'If this is not for you, reply "no thanks" and I will leave you alone.',
      '',
      'Thanks,',
      '{{FromName}}',
    ].join('\n'),
  },

  studentFollowup: {
    subject: 'Re: The cold email that worked for you',

    body: [
      'Hi {{FirstName}},',
      '',
      'Floating this up once, then I will stop.',
      '',
      'If you have an outreach email that got a reply, the two-minute version is here: {{SubmitUrl}} - paste it as-is, identifying details get swapped for placeholders, and you can stay anonymous.',
      '',
      'Genuinely fine to ignore.',
      '',
      '{{FromName}}',
    ].join('\n'),
  },

  org: {
    subject: 'A free resource for {{Org}} members',

    body: [
      'Hi {{FirstName}},',
      '',
      '{{Note}}',
      '',
      'I run a free, public site called the Email Library: real student outreach emails that got replies - cold emails to professors, internship inquiries, podcast and event invites - each annotated with the moves it makes. Nothing to sign up for and nothing for sale; it is a reference for students writing their first one.',
      '',
      'Two ways it might be useful to {{Org}}, either one on its own is plenty:',
      '',
      '1. Share it with members. There is a blurb below sized for a newsletter or group chat.',
      '2. Point members at the submit form. If someone\'s outreach got a reply, adding it takes about two minutes: {{SubmitUrl}}. Names and schools are replaced with placeholders before publishing, replies are never published, and credit is optional.',
      '',
      'Happy to answer questions, or to send a version sized for a slide or a story.',
      '',
      'If this is not a fit, reply "no thanks" and I will not follow up.',
      '',
      'Thanks,',
      '{{FromName}}',
      '',
      '---',
      'Blurb to forward:',
      '',
      'Ever wondered what a cold email that actually works looks like? The Email Library ({{SiteUrl}}) is a free collection of real student outreach emails that got replies, annotated line by line. If one of yours worked, you can add it anonymously in two minutes: {{SubmitUrl}}',
    ].join('\n'),
  },

  orgFollowup: {
    subject: 'Re: A free resource for {{Org}} members',

    body: [
      'Hi {{FirstName}},',
      '',
      'Following up once on this, then I will leave it.',
      '',
      'The library is at {{SiteUrl}} and the submit form is at {{SubmitUrl}}. If sharing it with {{Org}} members is easy, that would be a real help; if not, no problem at all.',
      '',
      '{{FromName}}',
    ].join('\n'),
  },

  creator: {
    subject: 'A free library of student emails that worked',

    body: [
      'Hi {{FirstName}},',
      '',
      '{{Note}}',
      '',
      'I am a student building a free, public library of real student outreach emails that actually got replies - cold emails to professors, internship inquiries, podcast and event invites - each annotated with the specific moves it makes. Nothing to sign up for, nothing for sale. Most people write their first cold email having never seen one.',
      '',
      'Either of these would help, and one is plenty:',
      '',
      '1. If an email of yours got a reply, add it: {{SubmitUrl}}. Two minutes. Paste it exactly as you have it - names and schools are swapped for placeholders before publishing, the reply you got is never published, and credit is optional.',
      '2. If it is useful to the people who follow you, there is a line at the bottom you can paste into a caption.',
      '',
      'You get pitched a lot, so to be clear about what this is not: no fee, no affiliate link, no signup, nothing sponsored. It is a free resource I am trying to fill.',
      '',
      'If it is not for you, reply "no thanks" and I will not follow up.',
      '',
      'Thanks,',
      '{{FromName}}',
      '',
      '---',
      'Line to paste, if you want it:',
      '',
      'Ever wondered what a cold email that actually works looks like? {{SiteUrl}} is a free collection of real student emails that got replies, annotated line by line. You can add yours anonymously in two minutes: {{SubmitUrl}}',
    ].join('\n'),
  },

  creatorFollowup: {
    subject: 'Re: A free library of student emails that worked',

    body: [
      'Hi {{FirstName}},',
      '',
      'One nudge on this, then I will stop.',
      '',
      'The library is at {{SiteUrl}}; adding an email takes about two minutes at {{SubmitUrl}}, anonymously if you prefer.',
      '',
      'No hard feelings if you would rather not.',
      '',
      '{{FromName}}',
    ].join('\n'),
  },

};
