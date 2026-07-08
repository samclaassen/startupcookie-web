// Site-wide editable values. Edit numbers here, nothing else to touch.
window.SC_CONFIG = {
  // Current number of active clients (out of MAX_CLIENTS).
  // Set to a number (e.g. 4) to show "Current roster: 4/6." on the homepage.
  // Leave as null to hide the roster count until it is set.
  // If CLIENT_COUNT >= MAX_CLIENTS, booking CTAs marked with the
  // js-capacity-cta class switch their label to "Join the waitlist".
  CLIENT_COUNT: null,
  MAX_CLIENTS: 6
};
