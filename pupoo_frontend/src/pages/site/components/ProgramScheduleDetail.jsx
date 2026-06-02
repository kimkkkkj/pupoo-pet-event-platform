import { Navigate, useParams } from "react-router-dom";

// Keep this legacy screen safe if it gets reconnected later.
// The old version called a removed /api/programs/schedule endpoint.
function ProgramScheduleDetail() {
  const { id, eventId } = useParams();
  const resolvedEventId = eventId || id;
  const target = resolvedEventId
    ? `/program/all/${resolvedEventId}`
    : "/program/all";

  return <Navigate to={target} replace />;
}

export default ProgramScheduleDetail;
