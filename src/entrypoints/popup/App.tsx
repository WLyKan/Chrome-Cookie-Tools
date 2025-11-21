import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConfigTab } from "./ConfigTab";
import { OperationTab } from "./OperationTab";
import { Settings, Play } from "lucide-react";

function App() {
  const [activeTab, setActiveTab] = useState("operation");

  return (
    <div className="w-96 bg-background">
      {/* 标题 */}
      <div className="bg-linear-to-r from-primary to-primary/80 text-primary-foreground p-4">
        <h1 className="text-lg font-bold">Storage Dev Tools</h1>
        <p className="text-xs opacity-90 mt-1">Storage 读取与写入，方便开发调试</p>
      </div>

      {/* Tab切换 */}
      <div className="p-4 h-[448px] overflow-y-auto">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
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

          <TabsContent value="operation">
            <OperationTab />
          </TabsContent>

          <TabsContent value="config">
            <ConfigTab onConfigSaved={() => setActiveTab("operation")} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
