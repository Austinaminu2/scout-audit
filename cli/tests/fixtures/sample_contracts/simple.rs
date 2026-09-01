#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, Symbol};

#[contracttype]
pub enum DataKey {
    Balance(Address),
}

#[contracterror]
#[derive(Copy, Clone)]
pub enum Error {
    NotAuthorized = 1,
    InsufficientBalance = 2,
}

#[contract]
pub struct SimpleToken;

#[contractimpl]
impl SimpleToken {
    /// Credits `amount` to `to`'s balance. Requires `to` to authorize the call.
    pub fn credit(env: Env, to: Address, amount: i128) {
        to.require_auth();

        let key = DataKey::Balance(to.clone());
        let balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        let new_balance = balance.checked_add(amount).expect("overflow");

        env.storage().persistent().set(&key, &new_balance);
        env.storage().persistent().extend_ttl(&key, 100, 1000);
        env.events().publish((Symbol::new(&env, "credit"), to), amount);
    }
}
