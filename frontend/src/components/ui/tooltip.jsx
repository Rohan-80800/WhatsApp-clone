import { createContext, useContext, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";

const TooltipContext = createContext(null);

const TooltipProvider = ({ children }) => {
  const [tooltip, setTooltip] = useState(null);

  const showTooltip = (content, element) => {
    const rect = element.getBoundingClientRect();
    setTooltip({ content, position: rect });
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip, tooltip }}>
      {children}
      {tooltip &&
        createPortal(
          <div
            className={cn(
              "fixed z-50 bg-wa-bg-panel text-wa-text text-sm px-3 py-1 rounded-lg shadow-lg border border-wa-border",
              "max-w-xs"
            )}
            style={{
              top: tooltip.position.top - 40,
              left: tooltip.position.left + tooltip.position.width / 2,
              transform: "translateX(-50%)"
            }}
          >
            {tooltip.content}
            <div
              className="absolute w-3 h-3 bg-wa-bg-panel border-b border-r border-wa-border rotate-45"
              style={{
                bottom: "-7px",
                left: "50%",
                transform: "translateX(-50%) rotate(45deg)"
              }}
            />
          </div>,
          document.body
        )}
    </TooltipContext.Provider>
  );
};

const Tooltip = ({ children, content }) => {
  const ref = useRef(null);
  const { showTooltip, hideTooltip } = useContext(TooltipContext);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseEnter = () => {
      showTooltip(content, element);
    };

    const handleMouseLeave = () => {
      hideTooltip();
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [content, showTooltip, hideTooltip]);

  return (
    <span ref={ref} className="inline-block">
      {children}
    </span>
  );
};

export { TooltipProvider, Tooltip };
