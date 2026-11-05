CREATE INDEX "duels_player_a_idx" ON "duels" USING btree ("player_a");--> statement-breakpoint
CREATE INDEX "duels_player_b_idx" ON "duels" USING btree ("player_b");--> statement-breakpoint
CREATE INDEX "games_finished_at_idx" ON "games" USING btree ("finished_at");