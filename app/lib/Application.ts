import { Timestamp } from "next/dist/server/lib/cache-handlers/types";

export class Application {
    constructor(public id: string, public listing_id: string, public user_uuid: string, public description: string, public days_renting: number, public status: "pending" | "approved" | "rejected", public created_at: Timestamp) {
        this.id = id;
        this.listing_id = listing_id;
        this.user_uuid = user_uuid;
        this.description = description;
        this.days_renting = days_renting;
        this.status = status;
        this.created_at = created_at;
    }

    public fromJSON(json: any): void {
        this.id = json.id;
        this.listing_id = json.listing_id;
        this.user_uuid = json.user_uuid;
        this.description = json.description;
        this.days_renting = json.days_renting;
        this.status = json.status;
        this.created_at = json.created_at;
    }

    public toJSON(): any {
        return {
            id: this.id,
            listing_id: this.listing_id,
            user_uuid: this.user_uuid,
            description: this.description,
            days_renting: this.days_renting,
            status: this.status,
            created_at: this.created_at
        }
    }

    public verify(): boolean {
        if (!this.id || !this.listing_id || !this.user_uuid || !this.description || !this.days_renting || !this.status || !this.created_at) {
            return false;
        }
        return true;
    }
}
