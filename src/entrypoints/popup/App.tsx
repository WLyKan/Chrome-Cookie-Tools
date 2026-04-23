import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toast";
import { ConfigTab } from "./ConfigTab";
import { OperationTab } from "./OperationTab";
import { Settings, Play } from "lucide-react";

function App() {
  const [activeTab, setActiveTab] = useState("operation");
  const isDev = import.meta.env.DEV;

  return (
    <div className="flex h-[600px] w-[520px] flex-col overflow-hidden bg-background text-foreground">
      <Toaster />
      <header className="shrink-0 border-b border-border/80 bg-linear-to-br from-primary via-primary/95 to-primary/80 px-4 py-3.5 text-primary-foreground shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src="/icons/256.png"
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-lg shadow-md ring-2 ring-white/15"
            />
            {isDev && (
              <span className="absolute -right-1 -top-1 rounded-md bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm ring-1 ring-amber-950/10 motion-reduce:transition-none">
                Dev
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
              Storage Dev Tools
            </h1>
            <p className="mt-0.5 text-xs leading-relaxed text-primary-foreground/85">
              在当前站点读取存储并写回，便于联调与迁移
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex h-full min-h-0 flex-col gap-0"
        >
          <TabsList className="grid h-11 w-full shrink-0 grid-cols-2 gap-1 rounded-lg border border-border/60 bg-muted/40 p-1 shadow-xs">
            <TabsTrigger
              value="operation"
              className="cursor-pointer gap-2 rounded-md transition-colors duration-200 motion-reduce:transition-none data-[state=active]:shadow-sm"
            >
              <Play className="size-4 shrink-0" aria-hidden />
              操作
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="cursor-pointer gap-2 rounded-md transition-colors duration-200 motion-reduce:transition-none data-[state=active]:shadow-sm"
            >
              <Settings className="size-4 shrink-0" aria-hidden />
              配置
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="operation"
            className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none"
          >
            <OperationTab />
          </TabsContent>

          <TabsContent
            value="config"
            className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none"
          >
            <ConfigTab onConfigSaved={() => setActiveTab("operation")} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
