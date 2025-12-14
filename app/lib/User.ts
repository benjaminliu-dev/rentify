import { Timestamp } from "next/dist/server/lib/cache-handlers/types";

export class User {

    constructor(public name: string, public uuid: string, public email: string, public neighborhood: string, public role: string, public created_at: Timestamp, public stripe_customer_id?: string) {
        this.name = name;
        this.uuid = uuid;
        this.email = email;
        this.neighborhood = neighborhood;
        // this.role = role;
        this.created_at = created_at;
        this.stripe_customer_id = stripe_customer_id;
    }

    public fromJSON(json: any): void {
        this.name = json.name;
        this.uuid = json.uuid;
        this.email = json.email;
        this.neighborhood = json.neighborhood;
        this.role = json.role;
        this.created_at = json.created_at;
        this.stripe_customer_id = json.stripe_customer_id;
    }


    public toJSON(): any {
        return {
            name: this.name,
            uuid: this.uuid,
            email: this.email,
            neighborhood: this.neighborhood,
            role: this.role,
            created_at: this.created_at,
            stripe_customer_id: this.stripe_customer_id
        }
    }

    public verify(): boolean {
        if (this.name && this.uuid && this.email && this.neighborhood && this.role && this.created_at && this.stripe_customer_id ) {
            return true;
        }
        return false;
    }

}