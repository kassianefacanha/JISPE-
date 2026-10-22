const isAthleteApproved = (athlete) => Boolean(athlete) && (
  athlete.approvalStatus === undefined
  || athlete.approvalStatus === null
  || athlete.approvalStatus === 'approved'
);

module.exports = { isAthleteApproved };
