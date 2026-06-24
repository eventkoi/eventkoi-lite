import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { __, sprintf } from "@wordpress/i18n";

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
            {__("In person event", "eventkoi-lite")}
          </TabsTrigger>
          <TabsTrigger value="virtual" className="rounded-lg">
            {__("Virtual event", "eventkoi-lite")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inperson" className="mt-4">
          <div className="flex flex-col gap-2">
            <Label>{__("Location", "eventkoi-lite")}</Label>
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
                        {sprintf(__("Line %d", "eventkoi-lite"), index)}
                        {index > 1 && (
                          <div className="block text-xs">
                            {__("(Optional)", "eventkoi-lite")}
                          </div>
                        )}
                      </Label>
                    </div>
                    <Input
                      type="text"
                      id={`address${index}`}
                      value={event[`address${index}`]}
                      placeholder={__("Address", "eventkoi-lite")}
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
            <Label htmlFor="virtual_url">{__("URL", "eventkoi-lite")}</Label>
            <Input
              type="text"
              id="virtual_url"
              value={event?.virtual_url}
              placeholder={__("Web address of your event", "eventkoi-lite")}
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
