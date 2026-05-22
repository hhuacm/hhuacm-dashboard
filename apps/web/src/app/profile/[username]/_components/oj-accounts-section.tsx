import { Alert, Card } from "@heroui/react";

import type { PublicOjAccount } from "../_model/public-profile-view";
import { OjAccountCard } from "./oj-account-card";

export function OjAccountsSection({
  accounts,
  isStatsDisabled,
}: {
  accounts: PublicOjAccount[];
  isStatsDisabled: boolean;
}) {
  return (
    <Card>
      <Card.Header className="pb-2">
        <Card.Title className="text-xl">OJ 账号</Card.Title>
      </Card.Header>
      <Card.Content>
        {accounts.length > 0 ? (
          <div className="grid gap-3">
            {accounts.map((account) => (
              <OjAccountCard
                account={account}
                isStatsDisabled={isStatsDisabled}
                key={account.platform}
              />
            ))}
          </div>
        ) : (
          <Alert>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>该成员暂未登记 OJ 账号。</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
      </Card.Content>
    </Card>
  );
}
