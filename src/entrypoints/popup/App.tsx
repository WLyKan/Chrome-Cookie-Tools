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
    <div className="w-[520px] h-[680px] bg-background relative flex flex-col overflow-hidden">
      <Toaster />
      {/* 标题 */}
      <div className="bg-linear-to-r from-primary to-primary/80 text-primary-foreground p-4 flex items-center gap-3">
        <div className="relative">
          <img src="/icons/256.png" alt="Logo" className="w-10 h-10" />
          {isDev && (
            <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold px-1 rounded-lg shadow-md">
              DEV
            </span>
          )}
        </div>
        <div>
          <h1 className="text-lg font-bold">Storage Dev Tools</h1>
          <p className="text-xs opacity-90 mt-1">Storage 读取与写入，方便开发调试</p>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="p-4 flex-1 overflow-auto">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col overflow-hidden">
          <TabsList className="w-full">
            <TabsTrigger value="operation" className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              操作
            </TabsTrigger>
            <TabsTrigger value="config" className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              配置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="operation" className="flex-1 mt-3 overflow-auto">
            <OperationTab />
          </TabsContent>

          <TabsContent value="config" className="flex-1 mt-3 overflow-auto">
            <ConfigTab onConfigSaved={() => setActiveTab("operation")} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
