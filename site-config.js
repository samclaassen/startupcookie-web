// Site-wide editable values. Edit numbers here, nothing else to touch.
window.SC_CONFIG = {
  // Current number of active clients (out of MAX_CLIENTS).
  // Set to a number (e.g. 4) to show "Current roster: 4/6." on the homepage.
  // Leave as null to hide the roster count until it is set.
  // If CLIENT_COUNT >= MAX_CLIENTS, booking CTAs marked with the
  // js-capacity-cta class switch their label to "Join the waitlist".
  CLIENT_COUNT: null,
  // Next date a client slot opens up. Shown in the homepage hero and
  // pricing card. Set to null to hide the line entirely.
  NEXT_OPENING: 'July 17th',
  MAX_CLIENTS: 6,
  // Google Analytics 4 Measurement ID (looks like "G-XXXXXXXXXX").
  // Paste it here once and analytics turns on across every page.
  // Leave as null and no analytics loads (no tracking, no cookies).
  GA4_MEASUREMENT_ID: null
};
