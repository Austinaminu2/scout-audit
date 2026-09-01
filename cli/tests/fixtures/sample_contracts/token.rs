#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

#[contracttype]
pub enum DataKey {
    Balance(Address),
}

#[contracterror]
#[derive(Copy, Clone)]
pub enum Error {
    NotAuthorized = 1,
    InsufficientBalance = 1,
}

#[contract]
pub struct VulnerableToken;

#[contractimpl]
impl VulnerableToken {
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        let from_key = DataKey::Balance(from.clone());
        let to_key = DataKey::Balance(to.clone());

        let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap();
        let to_balance: i128 = env.storage().persistent().get(&to_key).unwrap();

        let new_from_balance = from_balance - amount;
        let new_to_balance = to_balance + amount;

        env.storage().persistent().set(&from_key, &new_from_balance);
        env.storage().persistent().set(&to_key, &new_to_balance);
    }

    pub fn withdraw(env: Env, from: Address, amount: i128) {
        let from_key = DataKey::Balance(from.clone());

        let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap();
        let new_from_balance = from_balance - amount;

        env.storage().persistent().set(&from_key, &new_from_balance);
    }
}
