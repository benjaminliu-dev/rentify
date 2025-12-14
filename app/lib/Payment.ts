import { Timestamp } from "firebase/firestore";

export class Payment {
    constructor(public id: string, public listing_id: string, public tenant_uuid: string, public owner_uuid: string, public stripe_payment_intent_id: string, public amount: number, public status: "pending" | "paid" | "failed" | "refunded", public created_at: Timestamp) {
        this.id = id;
        this.listing_id = listing_id;
        this.tenant_uuid = tenant_uuid;
        this.owner_uuid = owner_uuid;
        this.stripe_payment_intent_id = stripe_payment_intent_id;
        this.amount = amount;
        this.status = status;
        this.created_at = created_at;
    } 

    public fromJSON(json: any): void {
        this.id = json.id;
        this.listing_id = json.listing_id;
        this.tenant_uuid = json.tenant_uuid;
        this.owner_uuid = json.owner_uuid;
        this.stripe_payment_intent_id = json.stripe_payment_intent_id;
        this.amount = json.amount;
        this.status = json.status;
        this.created_at = json.created_at;
    }

    public toJSON(): any {
        return {
            id: this.id,
            listing_id: this.listing_id,
            tenant_uuid: this.tenant_uuid,
            owner_uuid: this.owner_uuid,
            stripe_payment_intent_id: this.stripe_payment_intent_id,
            amount: this.amount,
            status: this.status,
            created_at: this.created_at
        }
    }

    public verify(): boolean {
        if (!this.id || !this.listing_id || !this.tenant_uuid || !this.owner_uuid || !this.stripe_payment_intent_id || !this.amount || !this.status || !this.created_at) {
            return false;
        }
        return true;
    }
}
