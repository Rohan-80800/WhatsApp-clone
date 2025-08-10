import { toast } from "sonner";

export const toast = ({
  title,
  description,
  variant = "default",
  duration = 3000
}) => {
  const toastMethod =
    {
      success: toast.success,
      error: toast.error,
      default: toast
    }[variant] || toast;

  toastMethod(title || "", {
    description,
    duration,
    position: "top-right",
    className: `toast-${variant}`
  });
};
