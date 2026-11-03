const registrationDeadline = new Date('2026-11-07T00:00:00-03:00');

const isRegistrationOpen = (controls, field, now = new Date()) => (
  controls?.[field] !== false && now < registrationDeadline
);

const applyRegistrationDeadline = (controls, now = new Date()) => ({
  ...controls,
  entityRegistrationOpen: isRegistrationOpen(controls, 'entityRegistrationOpen', now),
  athleteRegistrationOpen: isRegistrationOpen(controls, 'athleteRegistrationOpen', now),
  selfAthleteRegistrationOpen: isRegistrationOpen(controls, 'selfAthleteRegistrationOpen', now),
});

module.exports = { applyRegistrationDeadline, isRegistrationOpen, registrationDeadline };