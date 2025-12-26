import { useState, forwardRef, createContext, useContext } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Search, 
  Inbox, 
  BarChart3, 
  MessageSquare, 
  Cpu, 
  Link2, 
  TrendingUp,
  Settings,
  HelpCircle,
  Radio,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ForzeoLogo } from "@/components/ForzeoLogo";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { icon: Home, label: "Home", href: "/" },
      { icon: Radio, label: "War Room", href: "/war-room" },
      { icon: Search, label: "Search", href: "/search" },
      { icon: Inbox, label: "Inbox", href: "/inbox" },
    ],
  },
  {
    title: "Metrics",
    items: [
      { icon: BarChart3, label: "Industry", href: "/industry" },
      { icon: MessageSquare, label: "Topic", href: "/topic" },
      { icon: Cpu, label: "Model", href: "/model" },
      { icon: Link2, label: "Citation", href: "/citation" },
      { icon: TrendingUp, label: "Improve", href: "/improve" },
    ],
  },
];

// Context for sidebar state
interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const toggle = () => setIsOpen(!isOpen);
  
  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

// Toggle button for use in headers - single source of truth
export function SidebarToggle({ className }: { className?: string }) {
  const { isOpen, toggle } = useSidebar();
  
  return (
    <button
      onClick={toggle}
      className={cn(
        "p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-fz",
        className
      )}
      aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
    >
      {isOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
    </button>
  );
}

export const Sidebar = forwardRef<HTMLElement>(function Sidebar(_, ref) {
  const location = useLocation();
  const { isOpen } = useSidebar();

  return (
    <>
      {/* Sidebar */}
      <motion.aside
        ref={ref}
        initial={false}
        animate={{
          width: isOpen ? 224 : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar overflow-hidden",
          !isOpen && "border-r-0"
        )}
      >
        <div className="flex h-full flex-col w-56">
          {/* Header with Logo */}
          <div className="flex items-center p-4 h-16">
            <ForzeoLogo size="sm" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-6 px-3 py-2 overflow-y-auto">
            {navSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                {section.title && (
                  <h4 className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h4>
                )}
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.label}>
                        <Link
                          to={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-body-sm font-medium transition-all duration-fz",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-3">
            <div className="space-y-1">
              <Link
                to="/settings"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-body-sm transition-colors duration-fz",
                  location.pathname === "/settings"
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Settings</span>
              </Link>
              <a
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-body-sm text-sidebar-foreground transition-colors duration-fz hover:bg-sidebar-accent"
              >
                <HelpCircle className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Help & Support</span>
              </a>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
});
