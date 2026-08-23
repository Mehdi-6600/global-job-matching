import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <Icon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
      <p className="text-slate-400 font-medium mb-1">{title}</p>
      <p className="text-slate-500 text-sm mb-6">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-5 py-2 rounded-xl text-sm transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
