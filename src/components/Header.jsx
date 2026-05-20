import React from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";

export function Header({ APP_VERSION, setActiveSection, onOpenComposer, onNotify }) {
  return (
    <header className="sticky top-0 z-30 bg-white/45 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-[1680px] items-center justify-between px-5 lg:px-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="lg:hidden"><Icon name="menu" /></Button>
          <div>
            <h1 className="text-[22px] leading-7 font-black tracking-tight text-slate-950">Illusory Studio</h1>
            <p className="text-[12px] leading-4 font-medium text-slate-500">AI 商业视觉创作工作台</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">{APP_VERSION}</span>
          <Button variant="secondary" className="hidden sm:inline-flex" onClick={onNotify}><Icon name="bell" />通知</Button>
          <Button onClick={() => { setActiveSection("create"); onOpenComposer?.(); }}><Icon name="plus" />新建项目</Button>
        </div>
      </div>
    </header>
  );
}
