import { Timestamp } from "next/dist/server/lib/cache-handlers/types";
import { Price } from "./Price";

export class Listing {
    
    constructor(public id: string, public owner_uuid: string, public active: boolean, public status: "available" | "pending" | "rented", public title: string, public description: string, public image_uris: string[], public price: Price, public created_at: Timestamp, public current_tenant_uuid?: string) {
        this.id = id;
        this.owner_uuid = owner_uuid;
        this.active = active;
        this.status = status;
        this.title = title;
        this.description = description;
        this.image_uris = image_uris;
        this.price = price;
        this.created_at = created_at;
        this.current_tenant_uuid = current_tenant_uuid;
    }

    public fromJSON(json: any): void {
        this.id = json.id;
        this.owner_uuid = json.owner_uuid;
        this.active = json.active;
        this.status = json.status;
        this.title = json.title;
        this.description = json.description;
        this.image_uris = json.image_uris;
        this.price = json.price;
        this.created_at = json.created_at;
        if (!json.current_tenant_uuid) {
            return
        }
        this.current_tenant_uuid = json.current_tenant_uuid;
        return
    }

    public toJSON(): any {
        return {
            id: this.id,
            owner_uuid: this.owner_uuid,
            active: this.active,
            status: this.status,
            title: this.title,
            description: this.description,
            image_uris: this.image_uris,
            price: this.price,
            created_at: this.created_at,
            current_tenant_uuid: this.current_tenant_uuid
        }
    }


    public verify(): boolean {
        if (!this.id || !this.owner_uuid || !this.active || !this.status || !this.title || !this.description || !this.image_uris || !this.price || !this.created_at || !this.price.amount || !this.price.unit) {
            return false;
        }
        return true;
    }

}