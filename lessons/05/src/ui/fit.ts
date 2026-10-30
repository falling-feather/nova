// Keep text and controls at their designed size; layout changes at breakpoints.
export function fitStage(stage:HTMLElement) {
  const apply=()=>{
    stage.dataset.layout=innerWidth>=1280?"desk":innerWidth>=900?"tablet":"mobile";
  };
  apply();addEventListener("resize",apply);
}
