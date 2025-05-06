import {
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  LucideProps,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bell,
  BellOff,
  Settings,
  User,
  LogOut,
  Home,
  BarChart,
  Search,
  FileText,
  Filter,
  Moon,
  Sun,
  Undo,
  Redo,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Trash,
  Edit,
  Check,
  X,
  Copy,
  Save,
  Download,
  Upload,
  Eye,
  EyeOff,
  DollarSign,
  CreditCard,
  RefreshCw,
  Calendar,
  Clock,
  CircleHelp,
  MessageSquare,
  Workflow,
  LucideIcon,
  Image,
  FileJson,
  Layers,
  Code,
  Database,
  ExternalLink,
  Zap,
  Network,
  AlertTriangle,
  LayoutDashboard,
  Bot,
  Newspaper,
  Bot as BotIcon,
  Clock2,
  Radio,
  Rss,
  Info
} from "lucide-react";
import { SiTiktok, SiReddit, SiTelegram } from "react-icons/si";

export type Icon = LucideIcon;

export const Icons = {
  // Main app icons
  logo: Workflow,
  dashboard: LayoutDashboard,
  home: Home,
  settings: Settings,
  user: User,
  logout: LogOut,
  spinner: Loader2,
  chart: BarChart,
  search: Search,
  help: CircleHelp,
  
  // UI elements
  sun: Sun,
  moon: Moon,
  plus: Plus,
  edit: Edit,
  trash: Trash,
  check: Check,
  close: X,
  copy: Copy,
  save: Save,
  download: Download,
  upload: Upload,
  eye: Eye,
  eyeOff: EyeOff,
  undo: Undo,
  redo: Redo,
  left: ChevronLeft,
  right: ChevronRight,
  down: ChevronDown,
  arrowRight: ArrowRight,
  refresh: RefreshCw,
  calendar: Calendar,
  clock: Clock,
  info: Info,
  
  // Alert/notification icons
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  alert: AlertCircle,
  notification: Bell,
  notificationOff: BellOff,
  
  // Document/content icons
  file: FileText,
  image: Image,
  json: FileJson,
  layers: Layers,
  code: Code,
  externalLink: ExternalLink,
  
  // Feature-specific icons
  billing: DollarSign,
  card: CreditCard,
  filter: Filter,
  message: MessageSquare,
  database: Database,
  api: Zap,
  network: Network,
  workflow: Workflow,
  
  // Social media icons
  twitter: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: ({ ...props }: LucideProps) => (
    <SiTiktok {...props} />
  ),
  
  // OSINT tools icons
  tweepy: BotIcon,
  twint: Twitter,
  socialListener: ({ ...props }: LucideProps) => (
    <div className="flex items-center justify-center">
      <SiReddit {...props} className="mr-1" style={{ width: '45%', height: '45%' }} />
      <SiTelegram {...props} style={{ width: '45%', height: '45%' }} />
    </div>
  ),
  reddit: ({ ...props }: LucideProps) => (
    <SiReddit {...props} />
  ),
  telegram: ({ ...props }: LucideProps) => (
    <SiTelegram {...props} />
  ),
  newscatcher: Newspaper,
  huginn: Clock2,
  rss: Rss,
  radio: Radio,
};