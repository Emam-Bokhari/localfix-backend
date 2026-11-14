import {
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_TICKET_STATUS,
} from "../../../enums/supportTicket";

export { SUPPORT_TICKET_PRIORITY, SUPPORT_TICKET_STATUS };

export const SUPPORT_TICKET_SEARCHABLE_FIELDS = [
  "ticketId",
  "subject",
  "description",
  "requesterName",
  "requesterEmail",
  "relatedJobId",
];

export const SUPPORT_TICKET_FILTERABLE_FIELDS = [
  "searchTerm",
  "status",
  "priority",
  "requesterRole",
  "requester",
  "assignedAdmin",
];

