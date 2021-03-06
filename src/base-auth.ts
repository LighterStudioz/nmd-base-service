import { Observable } from 'rxjs/Observable';
import { BaseConfig } from './base-config';
import { HttpClient } from "@angular/common/http";
import { Injectable } from '@angular/core';

@Injectable()
export class BaseAuth {
    public authorization_url: string = '';                 // Authorization : Example http://[authorization_url]
    public authorization_url_login: string = '/login';           // Authorization : Example http://[authorization_url]/[login]   Get Refresh Token
    public authorization_url_logout: string = '/logout';          // Authorization : Example http://[authorization_url]/[logout]  Clear Token
    public authorization_url_token: string = '/accessToken';     // Authorization : Example http://[authorization_url]/[token]   Get Access Token

    private X_REFRESH_TOKEN: string = 'X-REFRESH-TOKEN';
    private X_ACCESS_TOKEN: string = 'X-ACCESS-TOKEN';

    private REFRESH_TOKEN: string;
    private ACCESS_TOKEN: string;

    constructor(private http) {

        this.REFRESH_TOKEN = localStorage.getItem(this.X_REFRESH_TOKEN);
        this.ACCESS_TOKEN = localStorage.getItem(this.X_ACCESS_TOKEN);
    }

    private parseJwt(token: string) {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace('-', '+').replace('_', '/');
        return JSON.parse(window.atob(base64));
    }

    private validJwt(token: string) {
        let payloads = this.parseJwt(token);
        //console.log(payloads);

        return parseInt(payloads['exp']) > ((new Date).getTime() / 1000);
    }

    private clearToken() {
        localStorage.removeItem(this.X_ACCESS_TOKEN);
        localStorage.removeItem(this.X_REFRESH_TOKEN);
    }

    private getToken(): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            let header = {};
            header[this.X_REFRESH_TOKEN] = this.REFRESH_TOKEN;

            this.http.get(this.authorization_url + this.authorization_url_token, {
                headers: header,
                responseType: 'json'
            }).subscribe(
                (res) => {
                    if (res["accessToken"]) {
                        let accessToken = res["accessToken"];
                        localStorage.setItem(this.X_ACCESS_TOKEN, accessToken);
                    } else {
                        this.clearToken();
                    }
                    resolve(true);
                },
                (e) => {
                    this.clearToken();
                    resolve(false);
                }
            );
        });
    }

    public login(userId: string, passId: string, ...values: { key: string, value: string }[]): Promise<boolean> {
        if (userId && passId) {
            return new Promise<boolean>((resolve) => {
                // Basic Authorization
                let header = {}
                let params = {};

                let authen = 'Basic ' + btoa(userId + ":" + passId);
                header['Authorization'] = authen;

                if (values) {
                    values.forEach(value => {
                        if (value.value) params[value.key] = value.value;
                    });
                }

                this.http.get(this.authorization_url + this.authorization_url_login, {
                    headers: header,
                    params: params,
                    responseType: "json"
                }).subscribe(
                    (res) => {
                        if (res["accessToken"] && res["refreshToken"]) {
                            let accessToken = res["accessToken"];
                            let refreshToken = res["refreshToken"];

                            localStorage.setItem(this.X_ACCESS_TOKEN, accessToken);
                            localStorage.setItem(this.X_REFRESH_TOKEN, refreshToken);

                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    },
                    (e) => { resolve(false) },
                );
            });
        } else {
            return new Promise<boolean>((resolve) => resolve(false));
        }
    }

    public logout(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            let header = {};
            header[this.X_REFRESH_TOKEN] = this.token();

            this.http.get(this.authorization_url + this.authorization_url_logout, {
                headers: header,
                responseType: 'text'
            }).subscribe(
                res => {
                    this.clearToken();
                    resolve(true);
                },
                e => {
                    console.log(e);
                    resolve(false);
                }
                );
        });
    }

    public logged():Promise<boolean> {
        return new Promise<boolean>(resolve=> {
            let token = localStorage.getItem(this.X_ACCESS_TOKEN) || null;

            if (token) {
                let validToken = this.validJwt(token);

                if (!validToken) {
                    this.getToken().then(res => resolve(res));
                } else {
                    resolve(true);
                }
            } else {
                resolve(false);
            }
        });
    }

    public payloads() {
        let token = localStorage.getItem(this.X_ACCESS_TOKEN) || null;
        let result = this.parseJwt(token);

        return JSON.parse(result["values"]);
    }

    public token() {
        return localStorage.getItem(this.X_ACCESS_TOKEN) || null;
    }


}
