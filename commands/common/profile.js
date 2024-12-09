/**
 * @fileoverview This module defines a Discord slash command that allows users to view their profile or someone else's profile.
 * It displays basic user information and allows the user to toggle their admiration opt-in status if it is their own profile.
 * 
 * Dependencies:
 * - Requires `discord.js` for building and executing Discord commands.
 * - Requires custom functions `getUserByID` and `createUserByID` from the API Functions for user data.
 * - Requires the `config.json` file for the developer IDs.
 * 
 * Constants:
 * - None in this file directly; relies on settings from the user data.
 * 
 * @module profileCommand
 * @version 2.0.0
 * @since 2024-08-18
 * 
 * @author 0xDrMoe
 */

const { EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { getUserByID, createUserByID } = require('../../API Functions/profiles');
const { devIDs } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your profile or someone else\'s')
        .addUserOption(option => option.setName('user').setDescription('User to view')),

    async execute(interaction) {
        const member = await interaction.options.getMember('user') || await interaction.member;
        console.log(member.presence.clientStatus);
        let memberData = await getUserByID(member.id);

        if (memberData.error) {
            console.error(`profile: failed to get user data for ${member.tag}`);
            // return interaction.reply({ content: `Failed to get user data for ${member.tag}. This shouldn't happen, please contact Moe.`, ephemeral: true });
        }

        if (memberData.result === 'No user found with that ID') {
            memberData = await createUserByID({ userID: member.id, admireOptIn: 1 }, member.id);
        }

        let profileEmbed = new EmbedBuilder()
            .setTitle(`${member.displayName}'s Profile`)
            .setColor(member.displayHexColor)
            .setThumbnail(member.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: `User ID: ${member.id} • Join discord.gg/tohe for any questions`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
            .addFields([
                { name: 'Known As:', value: `${await getTitle(member)}`, inline: true },
                { name: 'Account Created:', value: `<t:${Math.floor(member.user.createdAt.getTime() / 1000)}:R>`, inline: true },
                { name: 'Joined Server:', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Roles:', value: await getRoles(member) }
            ]);

        let status = `${member} `;
        // Loop through the clientStatus object to get the user's status on each platform
        for (const [key, value] of Object.entries(member.presence.clientStatus || {})) {
            // Check each platform and add the corresponding emoji to the status string
            if (key === 'desktop') {
                if (value === 'online') status += '<:d_online:1315460103151030342> ';
                if (value === 'idle') status += '<:d_idle:1315460100097572904> ';
                if (value === 'dnd') status += '<:d_dnd:1315460099048734800> ';
                if (value === 'offline') status += '<:d_offline:1315460101661921371> ';
            }
            if (key === 'mobile') {
                if (value === 'online') status += '<:m_online:1315460113875861524> ';
                if (value === 'idle') status += '<:m_idle:1315460110226690120> ';
                if (value === 'dnd') status += '<:m_dnd:1315460221057106010> ';
                if (value === 'offline') status += '<:m_offline:1315460222156017765> ';
            }
            if (key === 'web') {
                if (value === 'online') status += '<:w_online:1315460224735379516> ';
                if (value === 'idle') status += '<:w_idle:1315460117017395241> ';
                if (value === 'dnd') status += '<:w_dnd:1315460228309057587> ';
                if (value === 'offline') status += '<:w_offline:1315460120594878545> ';
            }
        }

        profileEmbed.setDescription(status);

        if (member.id === interaction.member.id) {
            profileEmbed.addFields([
                { name: 'Among Us Friend Code:', value: memberData.friendcode || 'Not Implemented (WIP)', inline: true },
                { name: 'Admire Opt-In:', value: memberData.admireOptIn ? 'Yes' : 'No', inline: true },
            ]);

            // const friendcodeButton = new ButtonBuilder()
            //     .setLabel('Set Among Us Friend Code')
            //     .setStyle(ButtonStyle.Primary)
            //     .setCustomId('set_friendcode');
            const admireButton = new ButtonBuilder()
                .setLabel('Toggle Admire Opt-In')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('toggle_admire_opt_in');

            const row = new ActionRowBuilder().addComponents(admireButton);
            return interaction.reply({ embeds: [profileEmbed], components: [row], ephemeral: true }).then(async (r) => {
                const collectorFilter = i => member.id === interaction.member.id;
                try {
                    await r.awaitMessageComponent({ filter: collectorFilter, max: 4, time: 300000 });
                } catch (e) {
                    row.components[0].setDisabled(true);
                    await interaction.editReply({ content: `This message has expired, please try again`, components: [row] });
                }
            }).catch(console.error);
        }

        interaction.reply({ embeds: [profileEmbed], ephemeral: true });
    }
};

async function getTitle(member) {
    const memberPermissions = member.permissions.toArray();
    if (devIDs.includes(member.id)) return '🤖 Bot Developer';
    if (member.id === member.guild.ownerId) return 'Server Owner';
    if (memberPermissions.includes('Administrator')) return 'Server Administrator';
    if (memberPermissions.includes('ManageGuild')) return 'Server Manager';
    if (memberPermissions.includes('ManageMessages') || memberPermissions.includes('ManageRoles')) return 'Server Moderator';
    return 'Server Member';
}

async function getRoles(member) {
    const memberRoles = member.roles.cache.sort((a, b) => b.position - a.position).map(r => r.name);
    const joinedRoles = memberRoles.join(', ');

    if (joinedRoles.length >= 1024) {
        return 'Too Many Roles';
    }

    return joinedRoles || 'No Roles';
}