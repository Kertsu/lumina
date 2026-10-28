import { ProjectionDesk } from "./projection-desk";
import { useIntegratedDeskController } from "./use-integrated-desk";

export function IntegratedOperator() {
    const controller = useIntegratedDeskController();
    return <ProjectionDesk controller={controller} />;
}
