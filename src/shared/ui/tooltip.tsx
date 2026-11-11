import {
    Tooltip as AstryxTooltip,
    type TooltipProps,
} from "@astryxdesign/core/Tooltip";

export function Tooltip(props: TooltipProps) {
    return <AstryxTooltip delay={350} {...props} />;
}
