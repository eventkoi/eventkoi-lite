import { BigLink } from "@/components/big-link";
import { Box } from "@/components/box";
import { Heading } from "@/components/heading";

import { BookOpen, Inbox } from "lucide-react";

export function QuickLinks() {
  return (
    <Box container>
      <Heading level={3}>Quick links</Heading>
      <BigLink href="https://eventkoi.com/docs">
        <BookOpen className="w-5 h-5 mr-4" />
        <span>Read documentation</span>
      </BigLink>
      <BigLink href="https://wordpress.org/support/plugin/eventkoi-lite/">
        <Inbox className="w-5 h-5 mr-4" />
        <span>Request support</span>
      </BigLink>
    </Box>
  );
}
