import React from "react";
import { Icon, cn } from "./Icon";

export function Sidebar({ activeSection, setActiveSection }) {
  const navItems = [
    { key: "explore", label: "探索", icon: "search" },
    { key: "create", label: "创作", icon: "sparkles" },
    { key: "tools", label: "工具", icon: "box" },
    { key: "tasks", label: "任务", icon: "clock" },
    { key: "assets", label: "资产", icon: "archive" },
    { key: "settings", label: "设置", icon: "settings" },
  ];
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[84px] flex-col items-center bg-white/70 py-5 backdrop-blur-xl lg:flex">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-black text-white shadow-lg shadow-indigo-200">IS</div>
      <nav className="mt-12 flex flex-1 flex-col gap-5">
        {navItems.map((item) => (
          <button key={item.key} type="button" onClick={() => setActiveSection(item.key)} className={cn("group flex flex-col items-center gap-1 rounded-2xl px-3 py-3 text-xs font-medium transition", activeSection === item.key ? "bg-indigo-100 text-indigo-600" : "text-slate-500 hover:bg-white hover:text-slate-900")}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <button type="button" onClick={() => setActiveSection("profile")} className={cn("mb-1 flex flex-col items-center gap-2 rounded-2xl px-3 py-3 transition", activeSection === "profile" ? "bg-indigo-100 text-indigo-600" : "text-slate-500 hover:bg-white hover:text-slate-900")}>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-slate-800 to-indigo-500 text-[13px] font-black text-white shadow-md">U</span>
        <span className="text-[11px] leading-3 font-bold">我的</span>
      </button>
    </aside>
  );
}
