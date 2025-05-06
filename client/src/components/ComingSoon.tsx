import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ 
  title,
  description = "This feature is currently under development and will be available soon."
}: ComingSoonProps) {
  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">{title}</h1>
        
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Clock className="h-5 w-5" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}