import { SignIn, SignUp } from "@/pages/auth";
import { Analytics, Budgets, Categories, Debts, Finances, Goals, Home, Reminders } from "@/pages/dashboard";
import {
  BellAlertIcon,
  ChartBarIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  HomeIcon,
  PresentationChartLineIcon,
  RectangleStackIcon,
  ServerStackIcon,
  TagIcon,
  TrophyIcon,
} from "@heroicons/react/24/solid";

const icon = {
  className: "w-5 h-5 text-inherit",
};

export const routes = [
  {
    layout: "dashboard",
    pages: [
      {
        icon: <HomeIcon {...icon} />,
        name: "dashboard",
        path: "/home",
        element: <Home />,
      },
      {
        icon: <CurrencyDollarIcon {...icon} />,
        name: "finanzas",
        path: "/finances",
        element: <Finances />,
      },
      {
        icon: <ChartBarIcon {...icon} />,
        name: "presupuestos",
        path: "/budgets",
        element: <Budgets />,
      },
      {
        icon: <PresentationChartLineIcon {...icon} />,
        name: "análisis",
        path: "/analytics",
        element: <Analytics />,
      },
      {
        icon: <BellAlertIcon {...icon} />,
        name: "recordatorios",
        path: "/reminders",
        element: <Reminders />,
      },
      {
        icon: <TrophyIcon {...icon} />,
        name: "metas",
        path: "/goals",
        element: <Goals />,
      },
      {
        icon: <CreditCardIcon {...icon} />,
        name: "deudas",
        path: "/debts",
        element: <Debts />,
      },
      {
        icon: <TagIcon {...icon} />,
        name: "categorías",
        path: "/categories",
        element: <Categories />,
      },
    ],
  },
  {
    title: "auth pages",
    layout: "auth",
    pages: [
      {
        icon: <ServerStackIcon {...icon} />,
        name: "sign in",
        path: "/sign-in",
        element: <SignIn />,
      },
      {
        icon: <RectangleStackIcon {...icon} />,
        name: "sign up",
        path: "/sign-up",
        element: <SignUp />,
      },
    ],
  },
];

export default routes;
