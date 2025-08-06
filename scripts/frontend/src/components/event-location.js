import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Panel } from "@/components/panel";

export function EventLocation({ event, setEvent }) {
  const onTabChange = (value) => {
    setEvent((prevState) => ({
      ...prevState,
      type: value,
    }));
  };

  return (
    <Panel>
      <Tabs defaultValue={event?.type} onValueChange={onTabChange}>
        <TabsList className="border border-input rounded-lg">
          <TabsTrigger value="inperson" className="rounded-lg">
            In person event
          </TabsTrigger>
          <TabsTrigger value="virtual" className="rounded-lg">
            Virtual event
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inperson" className="mt-4">
          <div className="flex flex-col gap-2">
            <Label>Location</Label>
            <div className="max-w-[422px] flex flex-col gap-3">
              {[1, 2, 3].map(function (index, i) {
                return (
                  <div
                    className="flex items-center gap-2"
                    key={`location-input-${i}`}
                  >
                    <div className="min-w-[80px] w-[80px]">
                      <Label
                        htmlFor={`address${index}`}
                        className="font-normal"
                      >
                        Line {index}
                        {index > 1 && (
                          <div className="block text-xs">(Optional)</div>
                        )}
                      </Label>
                    </div>
                    <Input
                      type="text"
                      id={`address${index}`}
                      value={event[`address${index}`]}
                      placeholder={"Address"}
                      onChange={(e) => {
                        setEvent((prevState) => ({
                          ...prevState,
                          [`address${index}`]: e.target.value,
                        }));
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="virtual" className="mt-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="virtual_url">URL</Label>
            <Input
              type="text"
              id="virtual_url"
              value={event?.virtual_url}
              placeholder="Web address of your event"
              className="max-w-[422px]"
              onChange={(e) => {
                setEvent((prevState) => ({
                  ...prevState,
                  virtual_url: e.target.value,
                }));
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </Panel>
  );
}
